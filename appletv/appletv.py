import asyncio
import pyatv
import time
import boto3
import json

# Run `atvremote scan` to find IP and login id
APPLE_TV_IP = '192.168.0.166'
LOGIN_ID = '00000000-0938-cca3-f7bb-bf126cd44a35'

sqs = boto3.resource('sqs')
queue = sqs.get_queue_by_name(QueueName='appletv')


def run_commands(loop, details, commands):
    print('Connecting to {}'.format(details.address))
    atv = pyatv.connect_to_apple_tv(details, loop)
    try:
        for command in commands:
            if instance(command, str):
                yield from getattr(atv.remote_control, command_name)()
            elif isinstance(command, float):
                time.sleep(command)
    finally:
        yield from atv.logout()


command_definitions = {
    'on': ['select'],
    'off': ['top_menu', 1.0, 'menu', 0.5, 'down', 0.5, 'select', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'down', 0.5, 'select'],
    'play': ['play'],
    'pause': ['pause'],
    'stop': ['menu'],
}


def receive_messages(loop, details):
    for message in queue.receive_messages(WaitTimeSeconds=20):
        try:
            data = json.loads(message.body)
            action = data.get('action')
            if action not in command_definitions:
                print('Invalid action {}'.format(action))
                continue
            run_commands(loop, details, command_definitions[action])
        except Exception:
            print('Error processing message: {}'.format(message))
        message.delete()


if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    details = pyatv.AppleTVDevice('AppleTV', APPLE_TV_IP, LOGIN_ID)

    while True:
        receive_messages(loop, details)
        time.sleep(1)
